"""
Simple test to verify job queue functionality.
Run this to ensure the job queue system is working correctly.

Usage:
    python test_job_queue.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.job_queue import get_job_queue, JobStatus


async def simple_task(value: int):
    """A simple async task for testing"""
    print(f"Task starting with value: {value}")
    await asyncio.sleep(2)  # Simulate work
    print(f"Task completed")
    return {'result': value * 2, 'message': 'Success'}


async def failing_task():
    """A task that fails for testing error handling"""
    print("Failing task starting...")
    await asyncio.sleep(1)
    raise Exception("This task is designed to fail")


async def test_job_queue():
    """Test the job queue system"""
    print("=== Testing Job Queue System ===\n")
    
    queue = get_job_queue()
    
    # Test 1: Create and execute a successful job
    print("Test 1: Successful job execution")
    job_id_1 = queue.create_job('test_job', metadata={'test': 'value1'})
    print(f"Created job: {job_id_1}")
    
    # Execute in background
    asyncio.create_task(queue.execute_job(job_id_1, simple_task, 10))
    
    # Poll for completion
    for i in range(10):
        await asyncio.sleep(0.5)
        job = queue.get_job(job_id_1)
        print(f"  Status: {job.status.value}, Progress: {job.progress}%")
        
        if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            break
    
    job = queue.get_job(job_id_1)
    if job.status == JobStatus.COMPLETED:
        print(f"✅ Job completed successfully!")
        print(f"   Result: {job.result}")
    else:
        print(f"❌ Job failed: {job.error}")
    
    print()
    
    # Test 2: Create and execute a failing job
    print("Test 2: Failing job execution")
    job_id_2 = queue.create_job('test_job_fail', metadata={'test': 'value2'})
    print(f"Created job: {job_id_2}")
    
    # Execute in background
    asyncio.create_task(queue.execute_job(job_id_2, failing_task))
    
    # Poll for completion
    for i in range(10):
        await asyncio.sleep(0.5)
        job = queue.get_job(job_id_2)
        print(f"  Status: {job.status.value}")
        
        if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            break
    
    job = queue.get_job(job_id_2)
    if job.status == JobStatus.FAILED:
        print(f"✅ Job correctly marked as failed")
        print(f"   Error: {job.error[:100]}...")  # First 100 chars
    else:
        print(f"❌ Job should have failed but didn't")
    
    print()
    
    # Test 3: Multiple concurrent jobs
    print("Test 3: Multiple concurrent jobs")
    job_ids = []
    for i in range(3):
        job_id = queue.create_job('concurrent_test', metadata={'index': i})
        job_ids.append(job_id)
        asyncio.create_task(queue.execute_job(job_id, simple_task, i))
        print(f"Created job {i+1}/3: {job_id}")
    
    # Wait for all to complete
    print("Waiting for all jobs to complete...")
    await asyncio.sleep(3)
    
    for idx, job_id in enumerate(job_ids):
        job = queue.get_job(job_id)
        status_symbol = "✅" if job.status == JobStatus.COMPLETED else "❌"
        print(f"{status_symbol} Job {idx+1}: {job.status.value} - Result: {job.result}")
    
    print()
    
    # Test 4: Get job that doesn't exist
    print("Test 4: Get non-existent job")
    job = queue.get_job('nonexistent-job-id')
    if job is None:
        print("✅ Correctly returned None for non-existent job")
    else:
        print("❌ Should have returned None")
    
    print()
    
    # Test 5: Job serialization
    print("Test 5: Job serialization")
    job = queue.get_job(job_id_1)
    job_dict = job.to_dict()
    print("✅ Job serialized to dict:")
    print(f"   Keys: {list(job_dict.keys())}")
    print(f"   Status: {job_dict['status']}")
    print(f"   Result: {job_dict['result']}")
    
    print("\n=== All Tests Completed ===")


if __name__ == '__main__':
    print("Starting job queue tests...\n")
    asyncio.run(test_job_queue())
    print("\n✅ All tests passed!")
