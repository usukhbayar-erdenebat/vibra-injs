const express = require('express');
const { Buffer } = require('buffer');
const { exec } = require('child_process');
const { Pool } = require('pg');

// Replace the connection string with the provided one
const connectionString = 'postgresql://doadmin:AVNS_6LM8d5bO2GCwNym-Hkl@indoora-db-do-user-13831734-0.b.db.ondigitalocean.com:25060/defaultdb';

// Create a new pool using the connection string
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Needed for DigitalOcean's managed databases with self-signed certificates
  },
});

async function connectAndQuery(insertData) {
  try {
    const client = await pool.connect();
    const insertQuery = `
    INSERT INTO vibra_sensor (
      application_name, application_id, device_name, device_profile_name, 
      device_profile_id, dev_e_ui, data, sequence_number, total_length,
      source_address, temp_humi_range, temp_humi_status, temp_humi_event,
      temp_humi_sen_val, x_axis_sen_event, x_axis_oa_velocity, x_axis_peakmg,
      x_axis_rm_smg, y_axis_sen_event, y_axis_oa_velocity, y_axis_peakmg,
      y_axis_rm_smg, z_axis_sen_event, z_axis_oa_velocity, z_axis_peakmg,
      z_axis_rm_smg, log_index, time1, device_events, device_power_src,
      device_battery_volt, time2, created_at -- Add the created_at column
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19, $20, $21,
      $22, $23, $24, $25,
      $26, $27, $28, $29,
      $30, $31, $32,
      NOW()
    )
    RETURNING id;
  `;
  
  // Execute the INSERT query
  const result = await pool.query(insertQuery, [
    insertData.applicationName,
    insertData.applicationID,
    insertData.deviceName,
    insertData.deviceProfileName, // Corrected from the duplicate
    insertData.deviceProfileID, // Corrected from the duplicate
    insertData.devEUI,
    insertData.data,
    insertData.outputData.SequenceNumber,
    insertData.outputData.TotalLength,
    insertData.outputData.SourceAddress,
    insertData.outputData.TempHumi.Range,
    insertData.outputData.TempHumi.Status,
    insertData.outputData.TempHumi.Event,
    insertData.outputData.TempHumi.SenVal,
    insertData.outputData.Accelerometer['X-Axis'].SenEvent,
    insertData.outputData.Accelerometer['X-Axis'].OAVelocity,
    insertData.outputData.Accelerometer['X-Axis'].Peakmg,
    insertData.outputData.Accelerometer['X-Axis'].RMSmg,
    insertData.outputData.Accelerometer['Y-Axis'].SenEvent,
    insertData.outputData.Accelerometer['Y-Axis'].OAVelocity,
    insertData.outputData.Accelerometer['Y-Axis'].Peakmg,
    insertData.outputData.Accelerometer['Y-Axis'].RMSmg,
    insertData.outputData.Accelerometer['Z-Axis'].SenEvent,
    insertData.outputData.Accelerometer['Z-Axis'].OAVelocity,
    insertData.outputData.Accelerometer['Z-Axis'].Peakmg,
    insertData.outputData.Accelerometer['Z-Axis'].RMSmg,
    insertData.outputData.Accelerometer.LogIndex,
    insertData.outputData.Accelerometer.Time,
    insertData.outputData.Device.Events,
    insertData.outputData.Device.PowerSrc,
    insertData.outputData.Device.BatteryVolt,
    insertData.outputData.Device.Time,
  ]);
  
  // The newly inserted row's ID will be available in result.rows[0].id
  console.log('Inserted row ID:', result.rows[0].id);
  
  

    // Release the client back to the pool
    client.release();
  } catch (error) {
    console.error('Error executing query:', error);
  } 
}

// connectAndQuery();



const app = express();
const port = 8081; // Your desired port

function base64ToHex(base64String) {
    const buffer = Buffer.from(base64String, 'base64');
    return buffer.toString('hex');
  }

  

app.use(express.json()); // To parse JSON request bodies

app.post('/', (req, res) => {
  const uplinkData = req.body; // The uplink data sent by ChirpStack
  // Process the uplink data as needed
//   console.log('Received uplink data:', uplinkData);
    // console.log("uplinkData : ", uplinkData);
    

    const base64String = uplinkData.data; // Replace this with your Base64 data
    const hexString = base64ToHex(base64String);
    // console.log('Hexadecimal representation:', hexString);

    const scriptPath = 'wise_engine.js'; // Replace this with the actual path to "wise_engine.js"
    const argument1 = hexString; // Replace 'value1' with the first argument value

    const command = `node ${scriptPath} ${argument1} `;

    exec(command, (error, stdout, stderr) => {
    if (error) {
        // console.error('Error:', error.message);
    } else {
        
        outputData = JSON.parse(stdout);
        // console.log('Standard Output:', outputData);
        var returnObject = {
            applicationName : uplinkData.applicationName,
            applicationID : uplinkData.applicationID,
            deviceName : uplinkData.deviceName,
            deviceProfileName : uplinkData.deviceProfileName,
            devEUI : uplinkData.devEUI,
            data : uplinkData.data,
            outputData : outputData,
        };
        console.log('Standard Output:', outputData.Device.Events);
        // console.error('Standard Error:', stderr);
        connectAndQuery(returnObject)
    }
    });
  res.sendStatus(200); // Send a response to ChirpStack
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
