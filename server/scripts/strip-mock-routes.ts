import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '..', 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

let prev = '';
while (prev !== content) {
  prev = content;
  content = content.replace(/  if \(!dbConnected\) \{[\s\S]*?\n  \}\n?/g, '');
}

content = content.replace(
  /  \} catch \{\n    res\.json\(filterSchedule\(dayType\)\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'Jadval', err);\n  }"
);

content = content.replace(
  /  \} catch \{\n    res\.json\(mockGroups\.map\(mapGroupListItem\)\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'Guruhlar', err);\n  }"
);

content = content.replace(
  /  \} catch \{\n    res\.json\(listTeachers\(\)\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'O\\'qituvchilar', err);\n  }"
);

content = content.replace(
  /  \} catch \{\n    res\.json\(getEmptyFinanceOverview\(year, month\)\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'Moliya', err);\n  }"
);

content = content.replace(
  /  \} catch \{\n    res\.json\(getMockStudentPayments\(year, month\)\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'To\\'lovlar', err);\n  }"
);

content = content.replace(
  /  \} catch \{\n    res\.json\(getMockMonthlyExpenses\(year, month\)\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'Xarajatlar', err);\n  }"
);

content = content.replace(
  /  \} catch \{\n    res\.json\(\[\{ id: 1, name: mockBranch \}\]\);\n  \}/g,
  "  } catch (err) {\n    dbError(res, 'Filiallar', err);\n  }"
);

// Remove duplicate public routes block at end (keep first health/sms/telegram)
const duplicateBlock = `\napp.get('/api/health', async (_req, res) => {
  res.json({
    ok: true,
    database: dbConnected ? 'connected' : 'mock',
    persistence: dbConnected,
  });
});

app.get('/api/sms/status', (_req, res) => {
  const mode = getSmsMode();
  if (mode === 'eskiz') {
    return res.json({
      configured: true,
      mode: 'eskiz',
      message: 'Eskiz.uz orqali SMS yuboriladi',
    });
  }
  if (mode === 'custom') {
    return res.json({
      configured: true,
      mode: 'custom',
      message: 'Maxsus SMS API ulangan',
    });
  }
  return res.json({
    configured: false,
    mode: 'mock',
    message: 'Haqiqiy SMS yuborilmaydi. server/.env ga ESKIZ_EMAIL va ESKIZ_PASSWORD qo\\'ying',
  });
});

app.get('/api/telegram/status', (_req, res) => {
  const username = getTelegramBotUsername();
  const linkedPhones = getLinkedPhonesCount();
  if (isTelegramConfigured()) {
    return res.json({
      configured: true,
      botUsername: username,
      linkedPhones,
      message: username
        ? \`@\${username} — telefon ulangan: \${linkedPhones} ta. Ota-ona /start va telefon ulashadi.\`
        : 'Telegram bot ulangan',
    });
  }
  return res.json({
    configured: false,
    botUsername: '',
    linkedPhones: 0,
    message: 'Telegram bot sozlanmagan. TELEGRAM_BOT_TOKEN qo\\'ying (@BotFather)',
  });
});

app.post('/api/telegram/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    await handleTelegramUpdate(req.body);
  } catch (err) {
    console.error('[Telegram webhook]', err);
  }
});

`;

if (content.includes(duplicateBlock.trim().slice(0, 50))) {
  const idx = content.lastIndexOf("app.get('/api/health', async (_req, res) =>");
  const branchesIdx = content.indexOf("app.get('/api/branches'", idx);
  if (idx > 0 && branchesIdx > idx) {
    content = content.slice(0, idx) + content.slice(branchesIdx);
  }
}

content = content.replace(
  "import { getEmptyFinanceOverview } from './financeData';\n",
  ''
);

fs.writeFileSync(filePath, content);
console.log('Done cleaning index.ts');
