import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertyRouter from "./property";
import contractRouter from "./contract";
import transactionsRouter from "./transactions";
import dividendsRouter from "./dividends";
import investorRouter from "./investor";
import faucetRouter from "./faucet";
import listingsRouter from "./listings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/property", propertyRouter);
router.use("/listings", listingsRouter);
router.use("/contract", contractRouter);
router.use("/transactions", transactionsRouter);
router.use("/dividends", dividendsRouter);
router.use("/investor", investorRouter);
router.use("/faucet", faucetRouter);

export default router;
