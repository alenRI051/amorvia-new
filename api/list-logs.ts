// /api/list-logs.ts
export default function handler(req: any, res: any) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({
      ok: true,
      items: [],
      source: "list-logs.ts alive"
    });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: String(err?.message || err)
    });
  }
}
