package com.example.missedcall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

class CallReceiver : BroadcastReceiver() {

    companion object {
        var lastState = ""
        var savedNumber: String? = null
    }

    override fun onReceive(context: Context, intent: Intent) {

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        if (state == TelephonyManager.EXTRA_STATE_RINGING) {
            lastState = "RINGING"
            savedNumber = number
        }
        else if (state == TelephonyManager.EXTRA_STATE_IDLE) {

            if (lastState == "RINGING" && savedNumber != null) {
                // MISSED CALL DETECTED
                NetworkHelper.sendMissedCall(context, savedNumber!!)
            }

            lastState = ""
            savedNumber = null
        }
    }
}

