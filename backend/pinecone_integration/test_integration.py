"""
Test script for Pinecone integration
Tests both ingestion and retrieval
"""
import os
import sys
import logging
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from parent backend directory
backend_dir = Path(__file__).parent.parent
env_file = backend_dir / ".env"
if env_file.exists():
    load_dotenv(env_file)
else:
    # Fallback: try current directory
    load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    """Test Pinecone connection"""
    logger.info("🧪 Testing Pinecone connection...")
    
    try:
        from pinecone_retriever import get_retriever
        
        retriever = get_retriever()
        stats = retriever.get_stats()
        
        logger.info(f"✅ Connection successful!")
        logger.info(f"📊 Index stats: {stats}")
        return True
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

def test_retrieval():
    """Test retrieval functionality"""
    logger.info("\n🧪 Testing retrieval...")
    
    try:
        from pinecone_retriever import get_retriever
        
        retriever = get_retriever()
        
        test_queries = [
            "What are the requirements for disability claims?",
            "BTL eligibility criteria",
            "Medical documentation requirements"
        ]
        
        for query in test_queries:
            logger.info(f"\n📝 Query: {query}")
            context = retriever.retrieve_context(query, top_k=3)
            
            if context:
                logger.info(f"✅ Retrieved {len(context)} characters")
                logger.info(f"Preview: {context[:200]}...")
            else:
                logger.warning(f"⚠️ No results for query: {query}")
        
        return True
    except Exception as e:
        logger.error(f"❌ Retrieval test failed: {e}")
        return False

def test_chat_history_retrieval():
    """Test retrieval with chat history"""
    logger.info("\n🧪 Testing chat history retrieval...")
    
    try:
        from pinecone_retriever import get_retriever
        
        retriever = get_retriever()
        
        chat_history = [
            {"role": "user", "content": "Tell me about disability claims"},
            {"role": "assistant", "content": "Disability claims require medical documentation..."},
            {"role": "user", "content": "What percentage is needed?"}
        ]
        
        context = retriever.retrieve_with_chat_history(
            current_query="What percentage is needed?",
            chat_history=chat_history,
            top_k=3
        )
        
        if context:
            logger.info(f"✅ Retrieved {len(context)} characters with chat history context")
        else:
            logger.warning("⚠️ No results with chat history")
        
        return True
    except Exception as e:
        logger.error(f"❌ Chat history retrieval test failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("="*80)
    logger.info("🚀 Starting Pinecone Integration Tests")
    logger.info("="*80)
    
    # Check environment
    if not os.environ.get("PINECONE_API_KEY"):
        logger.error("❌ PINECONE_API_KEY not set in environment!")
        return False
    
    tests = [
        ("Connection", test_connection),
        ("Retrieval", test_retrieval),
        ("Chat History Retrieval", test_chat_history_retrieval)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("📊 Test Summary")
    logger.info("="*80)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status} - {test_name}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    logger.info(f"\n{passed}/{total} tests passed")
    logger.info("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
