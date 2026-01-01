"""
In-memory job queue system for long-running tasks.
Provides job creation, status tracking, and result storage without database dependency.
"""
import uuid
import asyncio
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import logging
import traceback

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job status states"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Job:
    """Represents a single job in the queue"""
    
    def __init__(self, job_id: str, job_type: str, metadata: Optional[Dict[str, Any]] = None):
        self.job_id = job_id
        self.job_type = job_type
        self.status = JobStatus.PENDING
        self.metadata = metadata or {}
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.progress: int = 0  # 0-100 percentage
        self.progress_message: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary for API responses"""
        return {
            'job_id': self.job_id,
            'job_type': self.job_type,
            'status': self.status.value,
            'metadata': self.metadata,
            'result': self.result,
            'error': self.error,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'progress': self.progress,
            'progress_message': self.progress_message
        }


class JobQueue:
    """In-memory job queue manager"""
    
    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self._lock = asyncio.Lock()
    
    def create_job(self, job_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a new job and return its ID
        
        Args:
            job_type: Type of job (e.g., 'call_analysis', 'document_analysis')
            metadata: Optional metadata to associate with the job
        
        Returns:
            job_id: Unique identifier for the job
        """
        job_id = str(uuid.uuid4())
        job = Job(job_id, job_type, metadata)
        self.jobs[job_id] = job
        logger.info(f"Created job {job_id} of type {job_type}")
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID"""
        return self.jobs.get(job_id)
    
    async def update_job_progress(self, job_id: str, progress: int, message: str = ""):
        """Update job progress (0-100)"""
        job = self.get_job(job_id)
        if job:
            async with self._lock:
                job.progress = progress
                job.progress_message = message
                logger.debug(f"Job {job_id} progress: {progress}% - {message}")
    
    async def start_job(self, job_id: str):
        """Mark a job as running"""
        job = self.get_job(job_id)
        if job:
            async with self._lock:
                job.status = JobStatus.RUNNING
                job.started_at = datetime.utcnow()
                logger.info(f"Started job {job_id}")
    
    async def complete_job(self, job_id: str, result: Dict[str, Any]):
        """Mark a job as completed with result"""
        job = self.get_job(job_id)
        if job:
            async with self._lock:
                job.status = JobStatus.COMPLETED
                job.result = result
                job.completed_at = datetime.utcnow()
                job.progress = 100
                job.progress_message = "Completed"
                logger.info(f"Completed job {job_id}")
    
    async def fail_job(self, job_id: str, error: str):
        """Mark a job as failed with error"""
        job = self.get_job(job_id)
        if job:
            async with self._lock:
                job.status = JobStatus.FAILED
                job.error = error
                job.completed_at = datetime.utcnow()
                logger.error(f"Failed job {job_id}: {error}")
    
    async def execute_job(
        self,
        job_id: str,
        task_func: Callable,
        *args,
        **kwargs
    ):
        """
        Execute a job asynchronously in the background
        
        Args:
            job_id: Job ID to execute
            task_func: Async function to execute
            *args, **kwargs: Arguments to pass to task_func
        """
        job = self.get_job(job_id)
        if not job:
            logger.error(f"[JOB] ❌ Job {job_id} not found")
            return
        
        logger.info(f"[JOB] ▶️  Starting job {job_id} - Type: {job.job_type}")
        logger.info(f"[JOB] 📋 Task function: {task_func.__name__}")
        logger.info(f"[JOB] 📊 Args count: {len(args)}, Kwargs count: {len(kwargs)}")
        
        try:
            await self.start_job(job_id)
            logger.info(f"[JOB] 🔄 Executing task function...")
            result = await task_func(*args, **kwargs)
            logger.info(f"[JOB] ✅ Task function completed successfully")
            await self.complete_job(job_id, result)
            logger.info(f"[JOB] ✅ Job {job_id} marked as completed")
        except Exception as e:
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            logger.exception(f"[JOB] ❌ Job {job_id} failed: {e}")
            await self.fail_job(job_id, error_msg)
            logger.error(f"[JOB] ❌ Job {job_id} marked as failed")
    
    def cleanup_old_jobs(self, max_age_hours: int = 24):
        """
        Remove jobs older than max_age_hours
        
        Args:
            max_age_hours: Maximum age of jobs to keep in hours
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        jobs_to_remove = []
        
        for job_id, job in self.jobs.items():
            if job.created_at < cutoff_time and job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            del self.jobs[job_id]
            logger.info(f"Cleaned up old job {job_id}")
        
        if jobs_to_remove:
            logger.info(f"Cleaned up {len(jobs_to_remove)} old jobs")


# Global job queue instance
_job_queue: Optional[JobQueue] = None


def get_job_queue() -> JobQueue:
    """Get or create the global job queue instance"""
    global _job_queue
    if _job_queue is None:
        _job_queue = JobQueue()
    return _job_queue
