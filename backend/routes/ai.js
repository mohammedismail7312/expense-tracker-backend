const express = require('express');
const router = express.Router();

// Smarter local responder (works without API keys)
function generateLocalResponse(message) {
  const msg = message.toLowerCase().trim();

  const templates = {
    savings: [
      "Start by tracking all your expenses for a month to see where your money goes.",
      "Create a simple 50/30/20-style framework: 50% needs, 30% wants, 20% savings/debt-paydown.",
      "Automate transfers into a savings account right after payday so you " +
        "never accidentally spend it.",
      "Small habit changes (meal prepping, cancelling unused subs, negotiating bills) add up quickly.",
      "Set one concrete short-term goal (emergency fund of $500–$1,000) and one longer-term goal (6 months of expenses)."
    ],
    budgeting: [
      "Choose a budgeting method you can stick to (zero-based, envelope, or 50/30/20).",
      "List fixed and variable expenses, then identify 3 line-items to cut this month.",
      "Use a simple spreadsheet or a free app to categorize transactions automatically.",
      "Review and adjust monthly — budgets should be flexible, not restrictive."
    ],
    investing: [
      "Start with a clear time horizon and risk tolerance before picking investments.",
      "Consider low-cost index funds or ETFs for broad market exposure and diversification.",
      "Avoid trying to time the market; consistent contributions (dollar-cost averaging) reduce timing risk.",
      "If unfamiliar, begin with a retirement account (401(k)/IRA) and prioritize tax-advantaged options."
    ],
    tracking: [
      "Record every expense for at least 30 days to build an accurate picture.",
      "Categorize spendings (food, transport, subscriptions) and calculate monthly averages.",
      "Use that data to set targets for each category and detect one thing you can cut this month."
    ]
  };

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // Intent detection
  if (msg.includes('save') || msg.includes('saving') || msg.includes('emergency fund')) {
    return `Here are practical ways to save money:\n\n- ${templates.savings.map((t,i)=>`${i+1}. ${t}`).join('\n- ')}\n\nIf you tell me your monthly income and major expenses I can suggest a concrete budget.`;
  }

  if (msg.includes('budget') || msg.includes('budgeting')) {
    return `Budgeting guide:\n\n- ${templates.budgeting.join('\n- ')}\n\nWant a simple template? Tell me your monthly income and recurring bills and I'll draft one.`;
  }

  if (msg.includes('invest') || msg.includes('investment') || msg.includes('stocks') || msg.includes('etf')) {
    return `Investing basics:\n\n- ${templates.investing.join('\n- ')}\n\nTell me your investment horizon (years) and comfort with risk and I'll suggest next steps.`;
  }

  if (msg.includes('track') || msg.includes('expense') || msg.includes('expenses') || msg.includes('tracking')) {
    return `Expense tracking tips:\n\n- ${templates.tracking.join('\n- ')}\n\nIf you share one week's transactions (redact sensitive data), I can show where to cut.`;
  }

  if (msg.startsWith('what is') || msg.startsWith('define') || msg.includes('meaning of')) {
    // Short explanatory answers for definitional queries
    const subject = message.replace(/what is|define|meaning of/ig, '').trim();
    if (subject) {
      return `${subject.charAt(0).toUpperCase() + subject.slice(1)}: ${pick([`A concept used in personal finance — I can explain how it works and why it matters.`, `It relates to money management; ask me for examples or how to apply it to your situation.`, `A financial term people use when planning budgets and investments — tell me if you want a step-by-step.`])}`;
    }
  }

  // For everything else, provide a helpful, structured reply and offer follow-ups
  return `Good question — here's a step-by-step approach you can use:\n\n1) Clarify the goal: what outcome do you want?\n2) Gather numbers: income, major expenses, debts, savings.\n3) Pick one small action you can complete this week (e.g., cancel one subscription).\n4) Measure results after 30 days and iterate.\n\nIf you tell me more about your specific situation (income, monthly rent, debts), I can make this concrete.`;
}

// Try Groq with supported models
async function callGroq(message, context) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('no-groq-key');

  // Build context-aware prompt
  let fullPrompt = message;
  if (context && Object.keys(context).length > 0) {
    fullPrompt = `Here is the user's financial dashboard data:\n` +
      `- Total Income: ₹${context.totalIncome || '0'}\n` +
      `- Total Expense: ₹${context.totalExpense || '0'}\n` +
      `- Total Savings: ₹${context.totalSavings || '0'}\n` +
      `- Total Balance: ₹${context.totalBalance || '0'}\n`;
    
    if (context.recentTransactions && context.recentTransactions.length > 0) {
      fullPrompt += `- Recent Transactions:\n  ${context.recentTransactions.join('\n  ')}\n`;
    }
    
    fullPrompt += `\nUser's question: ${message}`;
  }

  // List of currently supported Groq models (tried in order)
  const models = [
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma-7b-it',
    'mixtral-8x7b-32768'
  ];

  for (const model of models) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          model: model, 
          messages: [{ role: 'user', content: fullPrompt }], 
          max_tokens: 512 
        })
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        const msg = body || `Groq returned ${resp.status}`;
        if (resp.status === 400 || msg.includes('decommissioned')) {
          continue; // Try next model
        }
        throw new Error(msg);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log(`✅ Groq model ${model} successful`);
        return content;
      }
    } catch (err) {
      console.warn(`⚠️ Model ${model} failed: ${err.message.substring(0, 80)}`);
    }
  }

  throw new Error('All Groq models failed');
}

// Try HuggingFace with fallback
async function callHuggingFace(message, context) {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) throw new Error('no-hf-token');

  // Build context-aware prompt
  let fullPrompt = message;
  if (context && Object.keys(context).length > 0) {
    fullPrompt = `Here is the user's financial dashboard data:\n` +
      `- Total Income: ₹${context.totalIncome || '0'}\n` +
      `- Total Expense: ₹${context.totalExpense || '0'}\n` +
      `- Total Savings: ₹${context.totalSavings || '0'}\n` +
      `- Total Balance: ₹${context.totalBalance || '0'}\n`;
    
    if (context.recentTransactions && context.recentTransactions.length > 0) {
      fullPrompt += `- Recent Transactions:\n  ${context.recentTransactions.join('\n  ')}\n`;
    }
    
    fullPrompt += `\nUser's question: ${message}`;
  }

  const model = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.1';
  const url = `https://router.huggingface.co/models/${model}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: fullPrompt, parameters: { max_new_tokens: 256 } })
  });

  if (!resp.ok) throw new Error(`HF returned ${resp.status}`);

  const data = await resp.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (data.generated_text) return data.generated_text;
  return null;
}

// Main endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, dashboardContext } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

    // Try external providers with context
    const providers = [
      { name: 'groq', fn: callGroq },
      { name: 'huggingface', fn: callHuggingFace }
    ];

    for (const p of providers) {
      try {
        const result = await p.fn(message, dashboardContext);
        if (result) {
          console.log(`✅ AI response via ${p.name}`);
          return res.json({ success: true, provider: p.name, message: result });
        }
      } catch (err) {
        console.warn(`⚠️ ${p.name} failed:`, err.message);
      }
    }

    // Fallback: smarter local response with context
    let fallbackMsg = generateLocalResponse(message);
    // If dashboard context is provided, personalize the response
    if (dashboardContext && dashboardContext.totalExpense && dashboardContext.totalExpense !== '0') {
      fallbackMsg += `\n\n📊 *Noting your dashboard shows:*\n` +
        `• Total Expense: ₹${dashboardContext.totalExpense}\n` +
        `• Total Savings: ₹${dashboardContext.totalSavings}\n` +
        `• Balance: ₹${dashboardContext.totalBalance}`;
    }
    console.log('✅ AI response via local fallback (no API key needed)');
    return res.json({ success: true, provider: 'local-fallback', message: fallbackMsg });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;
