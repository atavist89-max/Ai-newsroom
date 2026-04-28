package com.ainewsroom.app

import android.content.Intent
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "PipelineService")
class PipelineStatusPlugin : Plugin() {

    companion object {
        const val TAG = "PipelineStatusPlugin"
    }

    @PluginMethod
    fun start(call: PluginCall) {
        Log.d(TAG, "start() called")
        try {
            val intent = Intent(context, PipelineService::class.java)
            context.startForegroundService(intent)
            Log.d(TAG, "startForegroundService succeeded")
        } catch (e: Exception) {
            Log.e(TAG, "startForegroundService failed", e)
        }

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }

    @PluginMethod
    fun update(call: PluginCall) {
        val status = call.getString("status") ?: "Pipeline running"
        Log.d(TAG, "update() called with status: $status")
        try {
            val intent = Intent(context, PipelineService::class.java).apply {
                action = PipelineService.ACTION_UPDATE
                putExtra("status", status)
            }
            context.startService(intent)
            Log.d(TAG, "update service intent sent")
        } catch (e: Exception) {
            Log.e(TAG, "update service intent failed", e)
        }

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        Log.d(TAG, "stop() called")
        try {
            val intent = Intent(context, PipelineService::class.java).apply {
                action = PipelineService.ACTION_STOP
            }
            context.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "stop service failed", e)
        }

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }
}
