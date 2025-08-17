import axios from "axios";
import {Channel} from  "../../types.js"; 
import {createNotificationSSEStream} from "./notificationSSEClient.js"
import type {OnDataFunction} from "./notificationSSEClient.js"

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
    async function createNotificationsEventStream(onData:OnDataFunction, userId: string) {
        const { close } = createNotificationSSEStream(`${base_url}/notifications/sessions`, onData,userId);
        return {close}
    }

    return {
        sendNotification,
        createNotificationsEventStream
    }

} 

