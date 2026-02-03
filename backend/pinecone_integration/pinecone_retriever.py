"""
Pinecone Retriever for RAG in AI Lawyer Agent
Retrieves relevant context from Pinecone vector database based on queries.
"""
import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

# Load environment variables from parent backend directory
backend_dir = Path(__file__).parent.parent
env_file = backend_dir / ".env"
if env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()

logger = logging.getLogger(__name__)
logger.info("📚 Pinecone Retriever Module Loaded")

# Pinecone Configuration
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = "adhd-v2"
DEFAULT_NAMESPACE = "adhd-documents"
EMBEDDING_MODEL = "text-embedding-3-small"


class PineconeRetriever:
    """Retrieves relevant context from Pinecone for RAG."""
    
    def __init__(self, api_key: str = None, index_name: str = PINECONE_INDEX_NAME):
        """Initialize the retriever with Pinecone credentials."""
        self.api_key = api_key or PINECONE_API_KEY
        if not self.api_key:
            raise ValueError("PINECONE_API_KEY not set in environment or provided")
        
        self.pc = Pinecone(api_key=self.api_key)
        self.index_name = index_name
        self.index = None
        
        # Initialize OpenAI client for embeddings
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from app.secrets_utils import get_openai_api_key
        openai_api_key = get_openai_api_key()
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY not set in database or environment")
        self.openai_client = OpenAI(api_key=openai_api_key)
    
    def connect(self):
        """Connect to the Pinecone index."""
        try:
            logger.info(f"🔌 Connecting to Pinecone index: {self.index_name}")
            self.index = self.pc.Index(self.index_name)
            logger.info(f"✅ Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Pinecone index: {e}")
            raise
    
    def _embed_query(self, query: str) -> List[float]:
        """Convert text query to embedding vector using OpenAI."""
        try:
            logger.debug(f"🧠 Generating embedding for query: '{query[:50]}...'")
            response = self.openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=query
            )
            vector = response.data[0].embedding
            logger.debug(f"   ✅ Generated embedding vector ({len(vector)} dimensions)")
            return vector
        except Exception as e:
            logger.error(f"❌ Failed to generate embedding: {e}")
            raise
    
    def retrieve_context(
        self,
        query: str,
        top_k: int = 5,
        namespace: str = DEFAULT_NAMESPACE,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Retrieve relevant context from Pinecone based on a query.
        
        Args:
            query: The search query (text - will be converted to vector)
            top_k: Number of top results to retrieve
            namespace: Pinecone namespace to search in
            filter_metadata: Optional metadata filters
        
        Returns:
            Concatenated text from top results
        """
        if not self.index:
            self.connect()
        
        try:
            logger.debug(f"🔍 Querying Pinecone for: '{query[:60]}...'")
            logger.debug(f"   Top K: {top_k}, Namespace: {namespace}")
            
            # Convert text query to embedding vector
            query_vector = self._embed_query(query)
            
            # Query Pinecone with the vector
            results = self.index.query(
                namespace=namespace,
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
                filter=filter_metadata
            )
            
            if not results or not hasattr(results, 'matches') or not results.matches:
                logger.warning(f"⚠️ No results found for query: {query[:50]}...")
                return ""
            
            # Extract text chunks from results
            contexts = []
            for match in results.matches:
                metadata = match.get('metadata', {})
                chunk_text = metadata.get('chunk_text', '') or metadata.get('text', '')
                source_file = metadata.get('source_file') or metadata.get('source', 'unknown')
                score = match.get('score', 0)
                
                if chunk_text:
                    contexts.append(f"[Source: {source_file} | Score: {score:.2f}]\n{chunk_text}")
            
            combined_context = "\n\n---\n\n".join(contexts)
            logger.info(f"✅ Retrieved {len(contexts)} relevant chunks ({len(combined_context):,} chars)")
            logger.debug(f"   Scores: {[m.get('score', 0) for m in results.matches[:3]]}")
            
            return combined_context
            
        except Exception as e:
            logger.error(f"❌ Error retrieving context from Pinecone: {e}")
            return ""
    
    def retrieve_with_chat_history(
        self,
        current_query: str,
        chat_history: List[Dict[str, str]] = None,
        top_k: int = 5,
        namespace: str = DEFAULT_NAMESPACE
    ) -> str:
        """
        Retrieve context considering chat history for better context.
        
        Args:
            current_query: The current user query
            chat_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
            top_k: Number of top results to retrieve
            namespace: Pinecone namespace to search in
        
        Returns:
            Concatenated text from top results
        """
        # Build enhanced query from chat history
        enhanced_query = current_query
        
        if chat_history:
            # Extract keywords from recent history (last 3 messages)
            recent_messages = chat_history[-3:] if len(chat_history) > 3 else chat_history
            history_context = " ".join([msg.get("content", "") for msg in recent_messages])
            
            # Combine with current query for better semantic search
            enhanced_query = f"{current_query}\n\nPrevious context: {history_context[:500]}"
        
        return self.retrieve_context(
            query=enhanced_query,
            top_k=top_k,
            namespace=namespace
        )
    
    def retrieve_by_category(
        self,
        query: str,
        category: str,
        top_k: int = 5,
        namespace: str = DEFAULT_NAMESPACE
    ) -> str:
        """
        Retrieve context filtered by category.
        
        Args:
            query: The search query
            category: Category to filter by (e.g., "legal_document")
            top_k: Number of top results to retrieve
            namespace: Pinecone namespace to search in
        
        Returns:
            Concatenated text from top results
        """
        return self.retrieve_context(
            query=query,
            top_k=top_k,
            namespace=namespace,
            filter_metadata={"category": {"$eq": category}}
        )
    
    def get_stats(self, namespace: str = DEFAULT_NAMESPACE) -> Dict[str, Any]:
        """
        Get statistics about the Pinecone index.
        
        Args:
            namespace: Namespace to get stats for
        
        Returns:
            Dictionary with index statistics
        """
        if not self.index:
            self.connect()
        
        try:
            stats = self.index.describe_index_stats()
            logger.info(f"📊 Index stats: {stats}")
            return stats
        except Exception as e:
            logger.error(f"❌ Error getting index stats: {e}")
            return {}


# Singleton instance
_retriever_instance = None


def get_retriever() -> PineconeRetriever:
    """Get or create the global retriever instance."""
    global _retriever_instance
    
    if _retriever_instance is None:
        _retriever_instance = PineconeRetriever()
        _retriever_instance.connect()
    
    return _retriever_instance


if __name__ == "__main__":
    # Test the retriever
    logging.basicConfig(level=logging.INFO)
    
    retriever = get_retriever()
    
    # Test query
    test_query = "What are the requirements for disability claims?"
    context = retriever.retrieve_context(test_query, top_k=3)
    
    print("\n" + "="*80)
    print("TEST QUERY:", test_query)
    print("="*80)
    print(context)
    print("="*80)
