from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_active_user
from app.crud import crud_pipeline
from app.db.session import get_db
from app.schemas.pipeline import (
    Pipeline, 
    PipelineCreate, 
    PipelineUpdate,
    PipelineExecution,
    PipelineStatus,
    PipelineListResponse
)
from app.db.models.user import User
from app.cv.pipeline import pipeline_manager
from app.cv.nodes import get_available_node_types, get_node_config_schema

router = APIRouter()


@router.get("/", response_model=PipelineListResponse)
def read_pipelines(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by pipeline name or description"),
    status: Optional[str] = Query(None, description="Filter by status (active, inactive, error)"),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve pipelines for the current organization.
    """
    pipelines = crud_pipeline.get_pipelines(
        db,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        search=search,
        status=status
    )
    
    total = crud_pipeline.count_pipelines_by_organization(db, current_user.organization_id)
    
    return PipelineListResponse(
        pipelines=pipelines,
        total=total
    )


@router.post("/", response_model=Pipeline)
def create_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_in: PipelineCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new pipeline.
    """
    # Ensure the pipeline is created in the same organization
    pipeline_in.organization_id = current_user.organization_id
    
    # Check if pipeline name already exists in the organization
    existing_pipeline = crud_pipeline.get_pipeline_by_name(
        db, name=pipeline_in.name, organization_id=current_user.organization_id
    )
    if existing_pipeline:
        raise HTTPException(
            status_code=400,
            detail="Pipeline with this name already exists in your organization."
        )
    
    pipeline = crud_pipeline.create_pipeline(
        db, pipeline=pipeline_in, created_by_id=current_user.id
    )
    return pipeline


@router.get("/{pipeline_id}", response_model=Pipeline)
def read_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific pipeline by id.
    """
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check if the pipeline belongs to the same organization
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return pipeline


@router.put("/{pipeline_id}", response_model=Pipeline)
def update_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    pipeline_in: PipelineUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a pipeline.
    """
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check if the pipeline belongs to the same organization
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Only allow editing if pipeline is not active
    if pipeline.status == "active":
        raise HTTPException(
            status_code=400,
            detail="Cannot edit active pipeline. Stop it first."
        )
    
    pipeline = crud_pipeline.update_pipeline(db, pipeline_id=pipeline_id, pipeline=pipeline_in)
    return pipeline


@router.post("/{pipeline_id}/execute", response_model=Pipeline)
def execute_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    execution: Optional[PipelineExecution] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Execute pipeline operations (start, stop, restart) with Computer Vision integration.
    If no execution parameters provided, defaults to 'start' action.
    """
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check if the pipeline belongs to the same organization
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Default action if no execution parameters provided
    action = execution.action if execution else "start"
    
    # Validate action
    if action not in ["start", "stop", "restart"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # Converter dados do pipeline para formato de execução
    pipeline_config = {
        'name': pipeline.name,
        'description': pipeline.description,
        'nodes': [
            {
                'node_id': node.node_id,
                'node_type': node.node_type,
                'config': node.config,
                'position': node.position
            }
            for node in pipeline.nodes
        ],
        'edges': [
            {
                'edge_id': edge.edge_id,
                'source_node_id': str(edge.source_node_id),
                'target_node_id': str(edge.target_node_id),
                'source_handle': edge.source_handle,
                'target_handle': edge.target_handle
            }
            for edge in pipeline.edges
        ]
    }
    
    # Execute the action based on the requested operation
    if action == "start":
        if pipeline.status == "active":
            raise HTTPException(status_code=400, detail="Pipeline is already active")
        
        # Criar pipeline no gerenciador se não existir
        if not pipeline_manager.pipelines.get(str(pipeline.id)):
            success = pipeline_manager.create_pipeline(str(pipeline.id), pipeline_config)
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create pipeline execution instance"
                )
        
        # Iniciar execução
        success = pipeline_manager.start_pipeline(str(pipeline.id))
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to start pipeline execution"
            )
        new_status = "active"
        
    elif action == "stop":
        if pipeline.status != "active":
            raise HTTPException(status_code=400, detail="Pipeline is not active")
        
        # Parar execução
        success = pipeline_manager.stop_pipeline(str(pipeline.id))
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to stop pipeline execution"
            )
        new_status = "inactive"
        
    elif action == "restart":
        # Parar se estiver ativo
        if pipeline.status == "active":
            pipeline_manager.stop_pipeline(str(pipeline.id))
        
        # Criar/recriar pipeline
        success = pipeline_manager.create_pipeline(str(pipeline.id), pipeline_config)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to recreate pipeline execution instance"
            )
        
        # Iniciar execução
        success = pipeline_manager.start_pipeline(str(pipeline.id))
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to restart pipeline execution"
            )
        new_status = "active"
    
    # Update pipeline status
    pipeline = crud_pipeline.update_pipeline_status(db, pipeline_id=pipeline_id, status=new_status)
    return pipeline


@router.get("/{pipeline_id}/status", response_model=PipelineStatus)
def get_pipeline_status(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get pipeline execution status.
    """
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check if the pipeline belongs to the same organization
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # TODO: Get real-time status from pipeline execution engine
    return PipelineStatus(
        pipeline_id=pipeline.id,
        status=pipeline.status,
        is_running=pipeline.status == "active",
        last_execution=pipeline.updated_at,
        error_message=None,
        devices_count=0,  # TODO: Count connected devices
        events_count=0   # TODO: Count generated events
    )


@router.delete("/{pipeline_id}")
def delete_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a pipeline.
    """
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check if the pipeline belongs to the same organization
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Cannot delete active pipeline
    if pipeline.status == "active":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete active pipeline. Stop it first."
        )
    
    success = crud_pipeline.delete_pipeline(db, pipeline_id=pipeline_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return {"message": "Pipeline deleted successfully"}


@router.get("/active/list", response_model=List[Pipeline])
def get_active_pipelines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get all active pipelines for the organization.
    """
    pipelines = crud_pipeline.get_active_pipelines(db, current_user.organization_id)
    return pipelines


# Endpoint consolidado para execução de pipelines - removido duplicação
    
    # Atualizar status no banco
    crud_pipeline.update_pipeline(
        db, 
        pipeline_id=pipeline_id, 
        pipeline_update=PipelineUpdate(status="active")
    )
    
    return {"message": "Pipeline execution started", "pipeline_id": pipeline_id}


@router.post("/{pipeline_id}/stop")
def stop_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Para a execução de um pipeline.
    """
    # Verificar se pipeline existe
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Verificar permissões
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Parar execução
    success = pipeline_manager.stop_pipeline(str(pipeline.id))
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to stop pipeline execution"
        )
    
    # Atualizar status no banco
    crud_pipeline.update_pipeline(
        db,
        pipeline_id=pipeline_id,
        pipeline_update=PipelineUpdate(status="inactive")
    )
    
    return {"message": "Pipeline execution stopped", "pipeline_id": pipeline_id}


@router.post("/{pipeline_id}/pause")
def pause_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Pausa a execução de um pipeline.
    """
    # Verificar se pipeline existe
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Verificar permissões
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Pausar execução
    success = pipeline_manager.pause_pipeline(str(pipeline.id))
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to pause pipeline execution"
        )
    
    return {"message": "Pipeline execution paused", "pipeline_id": pipeline_id}


@router.post("/{pipeline_id}/resume")
def resume_pipeline(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Resume a execução de um pipeline pausado.
    """
    # Verificar se pipeline existe
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Verificar permissões
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Resumir execução
    success = pipeline_manager.resume_pipeline(str(pipeline.id))
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to resume pipeline execution"
        )
    
    return {"message": "Pipeline execution resumed", "pipeline_id": pipeline_id}


@router.get("/{pipeline_id}/execution-status")
def get_pipeline_execution_status(
    *,
    db: Session = Depends(get_db),
    pipeline_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Obtém o status detalhado de execução de um pipeline.
    """
    # Verificar se pipeline existe
    pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Verificar permissões
    if pipeline.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Obter status do gerenciador
    status_data = pipeline_manager.get_pipeline_status(str(pipeline.id))
    
    if not status_data:
        # Pipeline não está sendo executado
        return {
            "pipeline_id": pipeline_id,
            "status": "stopped",
            "message": "Pipeline is not currently executing"
        }
    
    return status_data


@router.get("/execution/list")
def list_executing_pipelines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Lista todos os pipelines em execução da organização.
    """
    # Obter todos os pipelines da organização
    org_pipelines = crud_pipeline.get_pipelines(
        db, 
        organization_id=current_user.organization_id,
        skip=0,
        limit=1000
    )
    
    executing_pipelines = []
    
    for pipeline in org_pipelines:
        status_data = pipeline_manager.get_pipeline_status(str(pipeline.id))
        if status_data and status_data['status'] in ['running', 'paused']:
            executing_pipelines.append({
                'pipeline_id': str(pipeline.id),
                'name': pipeline.name,
                'status': status_data['status'],
                'stats': status_data.get('stats', {}),
                'nodes_count': len(status_data.get('nodes', {}))
            })
    
    return {
        'executing_pipelines': executing_pipelines,
        'total_count': len(executing_pipelines)
    }


@router.get("/nodes/available")
def get_available_nodes() -> Any:
    """
    Retorna todos os tipos de nós disponíveis para construção de pipelines.
    """
    return get_available_node_types()


@router.get("/nodes/{node_type}/config-schema")
def get_node_config_schema_endpoint(node_type: str) -> Any:
    """
    Retorna o schema de configuração para um tipo específico de nó.
    """
    schema = get_node_config_schema(node_type)
    if not schema:
        raise HTTPException(
            status_code=404,
            detail=f"Schema not found for node type: {node_type}"
        )
    
    return {
        'node_type': node_type,
        'config_schema': schema
    }


@router.get("/system/stats")
def get_system_stats() -> Any:
    """
    Retorna estatísticas do sistema de pipelines.
    """
    return pipeline_manager.get_system_stats()
