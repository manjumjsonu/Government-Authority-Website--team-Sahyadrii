package com.example.missedcall

import android.content.Context
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

object NetworkHelper {

    private val client = OkHttpClient()

    private const val BACKEND_URL =
        "https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/api/missed-call"

    fun sendMissedCall(context: Context, phone: String) {

        val json = JSONObject()
        json.put("phone", phone)

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val body = json.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url(BACKEND_URL)
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {

            override fun onFailure(call: Call, e: IOException) {
                Log.e("NetworkHelper", "Failed: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                Log.d("NetworkHelper", "Success: ${response.code()}")
                response.close()
            }
        })
    }
}

