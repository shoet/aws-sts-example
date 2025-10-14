#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppStack } from "../lib/cdk-stack";

const app = new cdk.App();
new AppStack(app, "aws-sts-example-stack", {});

