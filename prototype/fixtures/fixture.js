// This is an independent sample application, not part of the executor.
const form = document.getElementById('application');
window.applicationState = {};
window.submissionCount = 0;
const renderState = () => { document.getElementById('state').textContent = JSON.stringify(window.applicationState, null, 2); };
form.addEventListener('input', capture);
form.addEventListener('change', capture);
form.addEventListener('submit', (event) => { event.preventDefault(); window.submissionCount++; });
function capture(event) {
  if (!event.target.name) return;
  const el = event.target;
  window.applicationState[el.name] = ['checkbox', 'radio'].includes(el.type) ? el.checked : el.value;
  renderState();
}
function section(title) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = title;
  fieldset.append(legend); form.append(fieldset); return fieldset;
}
function field(parent, id, text, type = 'text', choices) {
  const label = document.createElement('label'); label.htmlFor = id; label.textContent = text;
  const el = document.createElement(type === 'textarea' ? 'textarea' : choices ? 'select' : 'input');
  el.id = el.name = id;
  if (el.tagName === 'INPUT') el.type = type;
  if (!['checkbox', 'radio'].includes(type)) el.required = true;
  if (choices) for (const [value, label] of choices) el.add(new Option(label, value));
  const wrapper = document.createElement('div'); wrapper.className = 'field';
  wrapper.append(label, el); parent.append(wrapper); return el;
}
const base = section('基本信息');
field(base, 'name', '姓名'); field(base, 'email', '邮箱', 'email'); field(base, 'phone', '手机号', 'tel');
field(base, 'birthday', '出生日期', 'date');
if (document.body.dataset.case === 'plain') {
  field(base, 'city', '所在城市'); field(base, 'school', '学校'); field(base, 'major', '专业');
  field(base, 'degree', '学历', 'text', [['', '请选择'], ['bachelor', '本科'], ['master', '硕士'], ['phd', '博士']]);
  field(base, 'graduation', '毕业日期', 'date'); field(base, 'company', '实习公司'); field(base, 'role', '实习职位');
  field(base, 'start', '实习开始日期', 'date'); field(base, 'end', '实习结束日期', 'date');
  field(base, 'project', '项目名称'); field(base, 'link', '项目链接', 'url'); field(base, 'skills', '技能');
  field(base, 'language', '语言能力'); field(base, 'summary', '自我介绍', 'textarea');
  field(base, 'relocate', '接受异地工作', 'checkbox'); field(base, 'fulltime', '全职求职', 'radio');
} else if (document.body.dataset.case === 'dependent') {
  field(base, 'school', '学校'); field(base, 'major', '专业'); field(base, 'summary', '自我介绍', 'textarea');
  const country = field(base, 'country', '国家', 'text', [['', '请选择'], ['cn', '中国'], ['us', '美国']]);
  const city = field(base, 'city', '城市', 'text', [['', '请先选择国家']]); city.disabled = true;
  country.addEventListener('change', () => {
    const previous = document.getElementById('city'); previous.disabled = true;
    setTimeout(() => {
      const replacement = previous.cloneNode(false);
      const choices = country.value === 'cn' ? [['', '请选择'], ['beijing', '北京'], ['shanghai', '上海']] : [['', '请选择'], ['boston', '波士顿']];
      for (const [v, label] of choices) replacement.add(new Option(label, v));
      replacement.disabled = false; previous.replaceWith(replacement);
      delete window.applicationState.city; renderState();
    }, 60);
  });
} else {
  let count = 0;
  const add = () => {
    const i = ++count, group = section(`教育经历 ${i}`);
    field(group, `school-${i}`, '学校'); field(group, `major-${i}`, '专业');
    field(group, `degree-${i}`, '学历', 'text', [['', '请选择'], ['bachelor', '本科'], ['master', '硕士']]);
    field(group, `from-${i}`, '开始日期', 'date'); field(group, `to-${i}`, '结束日期', 'date');
  };
  add(); const button = document.createElement('button'); button.type = 'button'; button.textContent = '添加教育经历';
  button.addEventListener('click', add); form.append(button);
}
const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = '提交申请（仅计数）'; form.append(submit);
renderState();
