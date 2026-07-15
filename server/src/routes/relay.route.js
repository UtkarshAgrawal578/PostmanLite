import express from "express";
import {handleRelay} from "../controllers/relay.controller.js";

const router = express.Router();

router.post("/", handleRelay);

export default router;