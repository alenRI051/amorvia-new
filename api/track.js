module.exports = (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(204).end();
  } catch (e) {
    res.status(200).json({ ok: true });
  }
};
