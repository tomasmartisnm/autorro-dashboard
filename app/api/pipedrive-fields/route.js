export async function GET() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  const response = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}`
  );
  const data = await response.json();
  return Response.json(data);
}