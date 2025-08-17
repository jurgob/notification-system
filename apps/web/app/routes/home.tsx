import type { Route } from "./+types/home";
import {createUserSdk} from "@repo/backend/users_sdk" 
import {createNotificationSdk} from "@repo/backend/notifications_sdk" 
import type {NotificationEvent} from "@repo/backend/notifications_sdk" 
import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
const API_BASE_URL = `http://localhost:3000/api`;



export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}


export function Layout({children}: {children: React.ReactNode}) {
  return (
    <main className="flex items-center justify-center ">
      {children}
    </main>
  );
}

function getUserId(): undefined| string{
  const userid: undefined| string = "USR-ebc3e453-10da-4ad9-ba5d-bdf7a468e4c5"; // TODO: MOCK LOGGED USER, In real life this should come from cookies
  return userid

}

export async function loader({}: Route.LoaderArgs) {
  const userSdk = createUserSdk(API_BASE_URL);
  const users = await userSdk.getUsers();
  const userid: undefined| string = getUserId();
  return { loggedUserId: userid };
}
type ActionResult = {success: true, data:Record<string, string>} | {success: false, error: string}
export async function action({ request }: Route.ActionArgs) : Promise<ActionResult> {
  const notificationSdk = createNotificationSdk(API_BASE_URL);
  const formData = await request.formData();
  const message = formData.get("message");
  const action = formData.get("action");
  const userIdToNotify = formData.get("userId");
  const userid= getUserId()


  if (action === "createEvent") {
    if(!message || typeof message !== "string") return {success: false, error: "Message is required"};
    if(!userIdToNotify || typeof userIdToNotify !== "string") return {success: false, error: "userIdToNotify is required"};
    if (!userid) return {success: false, error: "You must be logged int"};

    const notificationResponse:ActionResult = await notificationSdk.sendNotification({
      body: message,
      channel:"APP",
      userId: userIdToNotify
    })
    .then((res) => {
      if (res.status> 299) {
        throw new Error("Failed to send notification");
      } 
      const result: ActionResult = {success: true, data: {}}
      return result;
    })
    .catch((err) => {
      console.error("Error sending notification:", err);
      const result: ActionResult = {success: false, error: "error"}
      return result
    });
    return notificationResponse
  }

  return { success: true, data:{} };
}

export default function Home() {
  const actionData = useActionData<typeof action>();
  const [events, setEvents] = useState<NotificationEvent[]>([])
  function addEvent(event: NotificationEvent) {
    setEvents((prev) => [...prev, event])
  }
  const data = useLoaderData<typeof loader>();
  const {loggedUserId} = data
  useEffect(()=> {
    if (!loggedUserId) 
      return;
    async function createStream(){
      console.log(`init createStream`)
      const notificationSdk = await createNotificationSdk(API_BASE_URL);
      const {close} = await notificationSdk.createNotificationsEventStream((data) => {
        addEvent(data);
      },loggedUserId!)
      console.log(`return createStream`)
      return close
    }
    let closeStream: (() => void) = () => {};

    createStream()
      .then((close) => {
        closeStream = close;
      });

    return () => {
      closeStream();
    };

  }, [loggedUserId])


  return <Layout >
    <div className="w-full space-y-6 px-4">
      {actionData?.success === false && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{actionData.error}</span>
        </div>
      )}
      {actionData?.success === true && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Success: </strong>
          <span className="block sm:inline">Notification sent successfully!</span>
        </div>
      )}
        <div className="leading-6 text-gray-700 dark:text-gray-200">
          {loggedUserId ? (
            <div>
              <nav className="flex justify-between items-center w-full mb-4">
                <div>Logged in as {loggedUserId}</div>
                <button>Log out</button>
              </nav>
              <main>
                <div className="w-full space-y-6 px-4">
                  <h2 className="text-lg font-semibold">Notification Events</h2>
                  <EventsList events={events} />
                </div>
                <div>
                  <Form method="post">
                    <textarea name="message" rows={3} className="w-full border border-gray-300 rounded-lg p-2" />
                    <br />
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">UserId: </label>
                    <input 
                      type="text" 
                      name="userId" 
                      defaultValue={loggedUserId} 
                      className="w-full border border-gray-300 rounded-lg p-2 mb-4"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      name="action"
                      value="createEvent"
                    >
                      Create Notification Event
                    </button>
                  </Form>
                </div>
              </main>
            </div>
            ) : (
            <div>Please log in</div>
          )}
        </div>
    </div>
  </Layout>;
}

function EventsList({ events }: { events: NotificationEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
