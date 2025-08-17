import {z} from 'zod';

export const UserId = z.string().regex(/^USR-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid User ID format"
}).brand<'UserId'>();
export type UserId = z.infer<typeof UserId>;

export const UserName = z.string().min(2).max(100)
export type UserName = z.infer<typeof UserName>;

export const Email = z.email({ message: "Please provide a valid email" });;
export type Email = z.infer<typeof Email>;

export const NotificationId = z.string().regex(/^NOT-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid Notification ID format"
}).brand<'NotificationId'>();
export type NotificationId = z.infer<typeof NotificationId>;


export const OrganizationId = z.string().regex(/^ORG-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid Organization ID format"
}).brand<'OrganizationId'>();
export type OrganizationId = z.infer<typeof OrganizationId>;

export const CHANNELS = ['EMAIL', 'APP'] as const;
export const Channel = z.enum(CHANNELS);
export type Channel = z.infer<typeof Channel>;

export const User = z.object({
    id: UserId,
    email: Email,
    name: UserName,
    organizationId: OrganizationId
});
export type User = z.infer<typeof User>;

export const UserCreate = z.object({
    email: Email,
    name: UserName,
    organizationId: OrganizationId
});

export const NotificationSessionCreate = z.object({
    userId: UserId
});
export type NotificationSessionCreate = z.infer<typeof NotificationSessionCreate>;  

export const Notification = z.object({
    id: NotificationId,
    userId: UserId,
    channel: Channel,
    body: z.string().max(500)
});

export type Notification = z.infer<typeof Notification>;