import express  from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {pinoLogger} from './logger.js';
const {logger}= pinoLogger
import {createNotificationsModule} from "./modules/notifications/notifications.js";
import {createUserModule} from "./modules/users/users.js";
import {createHealthModule} from "./modules/health/health.js";



// -----------
// INIT SERVER
// -----------

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(pinoLogger)

const userModule = createUserModule()
const notificationModule = createNotificationsModule()
const healthModule = createHealthModule()

// app.use(pino)
app.use('/api', healthModule.router);
app.use('/api', userModule.router);
app.use('/api', notificationModule.router);


async function main(){
    logger.info(`START APP`)
    logger.info(`START KAFKA `)
    await notificationModule.init()
    logger.info(`START API`)
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

main().catch((err) => {
    logger.error(`ERROR INITIALIZIND APP`, err)
    process.exit(1)
})