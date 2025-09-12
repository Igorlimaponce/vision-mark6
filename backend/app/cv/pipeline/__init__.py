"""
Módulo de pipelines de Computer Vision.
"""

from .executor import PipelineExecutor, PipelineStatus
from .manager import PipelineManager, pipeline_manager

__all__ = [
    'PipelineExecutor',
    'PipelineStatus', 
    'PipelineManager',
    'pipeline_manager'
]
