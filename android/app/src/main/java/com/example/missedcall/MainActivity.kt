package com.example.missedcall

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val permissions = arrayOf(
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.READ_CALL_LOG
    )

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val granted = result.values.all { it }
            if (!granted) Toast.makeText(this, "Permissions required", Toast.LENGTH_SHORT).show()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        checkPermissions()

        findViewById<Button>(R.id.testButton).setOnClickListener {
            NetworkHelper.sendMissedCall(this, "+919999999999")
            Toast.makeText(this, "Test Sent", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkPermissions() {
        val missing = permissions.any {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing) {
            permissionLauncher.launch(permissions)
        }
    }
}

