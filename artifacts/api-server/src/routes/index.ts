import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import ticketsRouter from "./tickets.js";
import activitiesRouter from "./activities.js";
import mappingRouter from "./mapping.js";
import syncRouter from "./sync.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(ticketsRouter);
router.use(activitiesRouter);
router.use(mappingRouter);
router.use(syncRouter);
router.use(dashboardRouter);

export default router;
