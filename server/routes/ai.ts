import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = Router();

// Initialize Gemini
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// 1. Clinical Note Synthesis
router.post('/synthesize-notes', async (req, res) => {
  const { chief_complaint, subjective, objective } = req.body;
  
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an expert clinical assistant. Synthesize a professional medical note in SOAP format based on these inputs:
      Chief Complaint: ${chief_complaint}
      Subjective: ${subjective}
      Objective: ${objective}
      
      Provide a concise Assessment and Plan.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessment: { type: Type.STRING },
            plan: { type: Type.STRING },
            diagnosis_suggestion: { type: Type.STRING }
          },
          required: ['assessment', 'plan', 'diagnosis_suggestion']
        }
      }
    });

    const result = JSON.parse(response.text ?? '{}');
    res.json(result);
  } catch (error: any) {
    console.error('AI Synthesis Error:', error);
    res.status(500).json({ error: 'Failed to synthesize notes' });
  }
});

// 2. Smart Triage Urgency Assessment
router.post('/smart-triage', async (req, res) => {
  const { chief_complaint, pain_scale, symptoms_duration, medical_history } = req.body;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Assess medical urgency for this patient triage:
      Complaint: ${chief_complaint}
      Pain Scale: ${pain_scale}/10
      Duration: ${symptoms_duration}
      History: ${medical_history}
      
      Determine priority (stat, high, normal) and reasoning.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.STRING, description: 'One of: stat, high, normal' },
            urgency_score: { type: Type.INTEGER, description: '1-10 urgency level' },
            reasoning: { type: Type.STRING },
            red_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['priority', 'urgency_score', 'reasoning']
        }
      }
    });

    res.json(JSON.parse(response.text ?? '{}'));
  } catch (error) {
    res.status(500).json({ error: 'Triage assessment failed' });
  }
});

// 3. Lab Result Interpreter
router.post('/interpret-labs', async (req, res) => {
  const { test_name, parameters } = req.body;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Interpret these laboratory results for ${test_name}:
      Parameters: ${JSON.stringify(parameters)}
      
      Provide a clinical interpretation and list any critical values.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interpretation: { type: Type.STRING },
            critical_findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.STRING }
          },
          required: ['interpretation']
        }
      }
    });

    res.json(JSON.parse(response.text ?? '{}'));
  } catch (error) {
    res.status(500).json({ error: 'Lab interpretation failed' });
  }
});

// 4. Literature Meta-Synthesis
router.post('/literature-meta-synthesis', async (req, res) => {
  const { papers } = req.body; // Array of { title, abstract }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Synthesize a professional meta-summary of these scientific papers:
      ${papers.map((p: any, i: number) => `Paper ${i+1}: ${p.title}\nAbstract: ${p.abstract}`).join('\n\n')}
      
      Focus on clinical consensus, conflicting findings, and future directions.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executive_summary: { type: Type.STRING },
            consensus_points: { type: Type.ARRAY, items: { type: Type.STRING } },
            clinical_implications: { type: Type.STRING },
            gaps_in_research: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['executive_summary', 'consensus_points']
        }
      }
    });

    res.json(JSON.parse(response.text ?? '{}'));
  } catch (error) {
    res.status(500).json({ error: 'Literature synthesis failed' });
  }
});

// 5. Medical Document OCR & Extraction
router.post('/ocr-document', async (req, res) => {
  const { image } = req.body; // Base64 image data

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: image.split(',')[1] || image
          }
        },
        { text: 'Extract all clinical data from this medical document. Identify patient name, date, clinical values, and diagnosis if present.' }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patient_name: { type: Type.STRING },
            report_date: { type: Type.STRING },
            test_results: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  parameter: { type: Type.STRING },
                  value: { type: Type.STRING },
                  unit: { type: Type.STRING }
                }
              } 
            },
            clinical_impression: { type: Type.STRING }
          }
        }
      }
    });

    res.json(JSON.parse(response.text ?? '{}'));
  } catch (error) {
    res.status(500).json({ error: 'Document OCR failed' });
  }
});

export default router;
