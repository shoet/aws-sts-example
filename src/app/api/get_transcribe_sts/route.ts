import { NextRequest, NextResponse } from "next/server";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export const GET = async (request: NextRequest) => {
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ message: "BadRequest" }, { status: 400 });
  }
  if (!verifyToken(token)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const credentials = await assumeRole();
  if (!credentials) {
    console.error("credentials not found");
    return NextResponse.json(
      { message: "InternalServerError" },
      { status: 500 },
    );
  }
  return NextResponse.json({ credentials }, { status: 200 });
};

function verifyToken(token: string) {
  // implement
  return true;
}

async function assumeRole() {
  const RoleArn = process.env.ASSUME_ROLE_ARN;
  const client = new STSClient();
  const command = new AssumeRoleCommand({
    RoleArn: RoleArn,
    RoleSessionName: "get-transcribe",
    DurationSeconds: 60 * 15,
  });

  const result = await client.send(command);
  return result.Credentials;
}
