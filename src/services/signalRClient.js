import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

let connection = null;

export const startSignalR = async (accessToken) => {
  if (connection) return connection;
  try {
    connection = new HubConnectionBuilder()
      .withUrl("https://localhost:7084/groupMemberHub", {
        accessTokenFactory: () => accessToken,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    await connection.start();
    return connection;
  } catch (err) {
    connection = null;
    return null;
  }
};

export const sendJoinRequestNotification = async (ownerUserId, notification, accessToken) => {
  try {
    const conn = await startSignalR(accessToken);
    if (conn) {
      await conn.invoke("SendJoinRequestNotification", ownerUserId, notification);
    }
  } catch (err) {
  }
};
