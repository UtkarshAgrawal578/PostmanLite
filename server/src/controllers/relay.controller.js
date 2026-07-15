import axios from "axios";

const METHODS_WITH_BODY = ["POST", "PUT", "PATCH", "QUERY", "DELETE"];

export const handleRelay = async (req, res) => {
  let { method = "GET", url, headers = {}, body } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  method = method.toUpperCase();
  const start = Date.now();

  try {
    const config = {
      method,
      url,
      headers: { ...headers },
      validateStatus: () => true, 
      timeout: 30000,
    };

    if (METHODS_WITH_BODY.includes(method) && body !== undefined && body !== "") {
      config.data = body;

      
      const hasContentType = Object.keys(config.headers).some(
        (h) => h.toLowerCase() === "content-type"
      );
      if (!hasContentType) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    const response = await axios.request(config);
    const timeTaken = Date.now() - start;

    const responseText =
      typeof response.data === "string" ? response.data : JSON.stringify(response.data);

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      time: timeTaken,
      size: Buffer.byteLength(responseText, "utf8"),
    });
  } catch (err) {
    res.status(500).json({
      error: "Request failed",
      details: err.message,
      time: Date.now() - start,
    });
  }
};