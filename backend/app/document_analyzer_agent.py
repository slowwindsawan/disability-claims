"""
Agent-based document analysis for Form 7801 and disability claims.
Orchestrates the flow of analyzing uploaded documents and generating claims strategy.
"""
import json
import logging
from typing import Dict, Any, Optional
import os
import sys

logger = logging.getLogger('document_analyzer_agent')


async def analyze_case_documents_with_agent(case_id: str, documents_data: list) -> Dict[str, Any]:
    """
    Analyze case documents using the OpenAI agent.
    
    Args:
        case_id: The case ID
        documents_data: List of documents with their summaries from case_documents table
    
    Returns:
        Agent analysis result
    """
    try:
        # Concatenate all document summaries
        document_summaries = []
        for doc in documents_data:
            if doc.get('metadata', {}).get('document_summary'):
                doc_summary = doc['metadata']['document_summary']
                doc_name = doc.get('file_name', 'Unknown Document')
                document_summaries.append(f"📄 {doc_name}:\n{doc_summary}")
        
        concatenated_context = "\n\n---\n\n".join(document_summaries) if document_summaries else "No documents provided"
        
        logger.info(f"📄 Concatenated {len(document_summaries)} document summaries for case {case_id}")
        logger.info(f"📝 Context length: {len(concatenated_context)} characters")
        
        # Call the Anthropic agent with the concatenated context
        from .anthropic_agent import run_document_analysis_agent
        
        result = await run_document_analysis_agent(
            case_id=case_id,
            context_text=concatenated_context
        )
        
        logger.info(f"✅ Agent analysis completed for case {case_id}")
        return result
        
    except Exception as e:
        logger.exception(f"❌ Error analyzing documents with agent: {e}")
        raise


def get_documents_summary(documents_list: list) -> str:
    """
    Extract and format document summaries for display.
    
    Args:
        documents_list: List of document records from case_documents
    
    Returns:
        Formatted string of all document summaries
    """
    summaries = []
    for doc in documents_list:
        metadata = doc.get('metadata', {})
        summary = metadata.get('document_summary', '')
        if summary:
            summaries.append(summary)
    
    return "\n\n".join(summaries)
