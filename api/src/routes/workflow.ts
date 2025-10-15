import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import type { Env } from '../types'
import { WorkflowHistoryService } from '../services/WorkflowHistoryService'
import type { WorkflowMetadata, WorkflowStats } from '../services/WorkflowHistoryService'

const workflow = new Hono<{ Bindings: Env }>()

// Workflow開始を記録
workflow.post('/start', async (c) => {
  try {
    const { syncType, metadata } = (await c.req.json()) as {
      syncType: string
      metadata: WorkflowMetadata
    }

    if (!syncType) {
      return c.json({ error: 'syncType is required' }, 400)
    }

    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    const workflowId = await service.startWorkflow(syncType, metadata || {})

    return c.json({
      success: true,
      id: workflowId,
      syncType,
      message: 'Workflow started',
    })
  } catch (error) {
    console.error('Failed to start workflow:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to start workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Workflow完了を記録
workflow.put('/:id/complete', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: 'Invalid workflow ID' }, 400)
    }

    const stats = (await c.req.json()) as WorkflowStats

    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    await service.completeWorkflow(id, stats)

    return c.json({
      success: true,
      id,
      message: 'Workflow completed',
    })
  } catch (error) {
    console.error('Failed to complete workflow:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to complete workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Workflow失敗を記録
workflow.put('/:id/fail', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: 'Invalid workflow ID' }, 400)
    }

    const { errorMessage } = (await c.req.json()) as { errorMessage: string }

    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    await service.failWorkflow(id, errorMessage || 'Workflow failed')

    return c.json({
      success: true,
      id,
      message: 'Workflow failure recorded',
    })
  } catch (error) {
    console.error('Failed to record workflow failure:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to record workflow failure',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Workflow実行履歴を取得
workflow.get('/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10)

    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    const history = await service.getWorkflowHistory(limit)

    // metadataをJSONとしてパース
    const historyWithParsedMetadata = history.map((record) => ({
      ...record,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
    }))

    return c.json({
      success: true,
      data: historyWithParsedMetadata,
    })
  } catch (error) {
    console.error('Failed to get workflow history:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to get workflow history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// 特定のWorkflowを取得
workflow.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: 'Invalid workflow ID' }, 400)
    }

    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    const record = await service.getWorkflowById(id)

    if (!record) {
      return c.json({ error: 'Workflow not found' }, 404)
    }

    return c.json({
      success: true,
      data: {
        ...record,
        metadata: record.metadata ? JSON.parse(record.metadata) : null,
      },
    })
  } catch (error) {
    console.error('Failed to get workflow:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to get workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// syncTypeごとの統計を取得
workflow.get('/stats/:syncType', async (c) => {
  try {
    const syncType = c.req.param('syncType')

    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    const stats = await service.getStatsBySyncType(syncType)

    return c.json({
      success: true,
      syncType,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to get workflow stats:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to get workflow stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// 実行中のWorkflowを取得
workflow.get('/running/list', async (c) => {
  try {
    const db = drizzle(c.env.DB)
    const service = new WorkflowHistoryService(db.$client)

    const runningWorkflows = await service.getRunningWorkflows()

    // metadataをJSONとしてパース
    const workflowsWithParsedMetadata = runningWorkflows.map((record) => ({
      ...record,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
    }))

    return c.json({
      success: true,
      count: workflowsWithParsedMetadata.length,
      data: workflowsWithParsedMetadata,
    })
  } catch (error) {
    console.error('Failed to get running workflows:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to get running workflows',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

export default workflow
