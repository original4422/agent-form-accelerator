// Fabricated data. This mapping belongs to the benchmark driver, never the executor.
const base = [
  ['name', '姓名', '林示例'], ['email', '邮箱', 'candidate@example.test'],
  ['phone', '手机号', '13800000000'], ['birthday', '出生日期', '2000-01-02'],
];
const entries = (rows, group = '基本信息') => rows.map(([id, label, value]) => ({id, label, value, group}));
export const cases = [
  {name: 'plain', fields: entries([...base,
    ['city', '所在城市', '北京'], ['school', '学校', '示例大学'], ['major', '专业', '计算机科学'], ['degree', '学历', 'master'],
    ['graduation', '毕业日期', '2027-06-30'], ['company', '实习公司', '示例科技'], ['role', '实习职位', '算法实习生'],
    ['start', '实习开始日期', '2025-07-01'], ['end', '实习结束日期', '2025-09-30'],
    ['project', '项目名称', '网页填表研究'], ['link', '项目链接', 'https://example.test/project'], ['skills', '技能', 'Python, TypeScript'],
    ['language', '语言能力', '中文、英文'], ['summary', '自我介绍', '这是一份用于本地验证的虚构资料。'],
    ['relocate', '接受异地工作', true], ['fulltime', '全职求职', true],
  ])},
  {name: 'dependent', fields: entries([...base,
    ['school', '学校', '示例大学'], ['major', '专业', '计算机科学'],
    ['summary', '自我介绍', '虚构资料，仅用于本地测试。'], ['country', '国家', 'cn'], ['city', '城市', 'beijing'],
  ])},
  {name: 'repeat', fields: [...entries(base),
    ...entries([['school-1', '学校', '示例本科大学'], ['major-1', '专业', '软件工程'], ['degree-1', '学历', 'bachelor'], ['from-1', '开始日期', '2019-09-01'], ['to-1', '结束日期', '2023-06-30']], '教育经历 1'),
    ...entries([['school-2', '学校', '示例研究生院'], ['major-2', '专业', '计算机科学'], ['degree-2', '学历', 'master'], ['from-2', '开始日期', '2024-09-01'], ['to-2', '结束日期', '2027-06-30']], '教育经历 2'),
  ]},
];

export async function oracle(page, task) {
  return page.evaluate((fields) => {
    const errors = [];
    for (const f of fields) {
      const el = document.getElementById(f.id);
      const actual = el && (['checkbox', 'radio'].includes(el.type) ? el.checked : el.value);
      if (!el || actual !== f.value || window.applicationState[f.id] !== f.value || el.validity.valid === false) {
        errors.push({id: f.id, expected: f.value, dom: actual, app: window.applicationState[f.id]});
      }
    }
    if (window.submissionCount !== 0) errors.push({submitted: window.submissionCount});
    return {passed: errors.length === 0, correct: fields.length - errors.filter((e) => e.id).length, total: fields.length, errors};
  }, task.fields);
}
