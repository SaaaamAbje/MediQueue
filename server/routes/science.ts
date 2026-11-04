import { Router } from 'express';

export const scienceRouter = Router();

// NCBI Proxy for dbSNP / Variations
scienceRouter.get('/ncbi/variation/:rsid', async (req, res) => {
  try {
    const { rsid } = req.params;
    const apiKey = process.env.NCBI_API_KEY;
    const url = `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${rsid}${apiKey ? `?api_key=${apiKey}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'NCBI API Error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// JASPAR Proxy (Transcription Factor Binding Sites)
scienceRouter.get('/jaspar/matrix/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `https://jaspar.elixir.no/api/v1/matrix/${id}/`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'JASPAR API Error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Europe PMC Full Text XML Proxy
scienceRouter.get('/epmc/xml/:pmcid', async (req, res) => {
  try {
    const { pmcid } = req.params;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Europe PMC Error' });
    }
    const data = await response.text();
    res.set('Content-Type', 'application/xml');
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
