

import {notificationAppClient,OnDataFunction} from "./notificationClient.js"
import axios from "axios";
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;




async function main(){
    const myCallback: OnDataFunction = (data) => {
        console.log(`myCallback`, data)
    }

  const client = await notificationAppClient(
    `${BASE_URL}/notifications/sessions`,
   myCallback
  )

  const notifyEvent = {
    "id": `NOT-${crypto.randomUUID()}`,
    "userId": `USR-${crypto.randomUUID()}`,
    "channel": "APP",
    "body": "Welcome to our platform! Your account has been successfully created."
    }

    const response = await axios.post(`${BASE_URL}/notifications`, notifyEvent)

    console.log(`response data:`, response.data)

}

main()