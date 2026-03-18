export async function GET(request) {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || "0";
  const url = "https://api.pipedrive.com/v1/deals?api_token=" + apiToken + "&limit=100&start=" + start + "&status=open";
  const response = await fetch(url);
  const data = await response.json();
  return Response.json(data);
}