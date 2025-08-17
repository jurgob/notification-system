import axios from "axios";
import {Channel} from  "../../types.js"; 
import {OnDataFunction,createNotificationSSEStream} from "./notificationSSEClient.js"

export type { OnDataFunction,NotificationEvent } from "./notificationSSEClient.js";

export type SdkCreateNotification = {userId:string,channel:Channel, body: string}
export function createNotificationSdk(base_url:string){
    async function sendNotification(obj:SdkCreateNotification) {
        const notifyEvent = {
            "id": `NOT-${crypto.randomUUID()}`,
            ...obj
        }
       
        const res = await axios.post(`${base_url}/notifications`, notifyEvent);
        const {status, data} = res
        return {status, data}
    }
    async function createNotificationsEventStream(onData:OnDataFunction) {
        const { close } = createNotificationSSEStream(`${base_url}/notifications/sessions`, onData);
        return {close}
    }

    return {
        sendNotification,
        createNotificationsEventStream
    }

} 

