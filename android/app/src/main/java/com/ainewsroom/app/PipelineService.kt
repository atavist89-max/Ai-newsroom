package com.ainewsroom.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class PipelineService : Service() {

    companion object {
        const val TAG = "PipelineService"
        const val CHANNEL_ID = "ai_newsroom_pipeline"
        const val NOTIFICATION_ID = 1
        const val ACTION_STOP = "STOP"
        const val ACTION_UPDATE = "UPDATE"
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "onCreate")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        Log.d(TAG, "onStartCommand action=$action")

        when (action) {
            ACTION_STOP -> {
                Log.d(TAG, "STOP requested")
                releaseWakeLock()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_UPDATE -> {
                val status = intent.getStringExtra("status") ?: "Pipeline running"
                Log.d(TAG, "UPDATE requested: $status")
                updateNotification(status)
                return START_STICKY
            }
        }

        // Start or update foreground
        acquireWakeLock()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }
        Log.d(TAG, "startForeground called")

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AiNewsroom::PipelineWakeLock"
            )
            wakeLock?.setReferenceCounted(false)
        }
        if (wakeLock?.isHeld == false) {
            wakeLock?.acquire(30 * 60 * 1000L) // 30 minutes max
            Log.d(TAG, "Wake lock acquired")
        }
    }

    private fun releaseWakeLock() {
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
            Log.d(TAG, "Wake lock released")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "AI Newsroom Pipeline"
            val descriptionText = "Keeps pipeline running in background"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created")
        }
    }

    private fun buildNotification(status: String = "Pipeline running"): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AI Newsroom")
            .setContentText(status)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    fun updateNotification(status: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification(status))
        Log.d(TAG, "Notification updated: $status")
    }
}
