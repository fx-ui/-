// 表单验证

/** 验证金额 */
export function validateAmount(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined) return { valid: false, msg: '请输入金额' };
  if (isNaN(num)) return { valid: false, msg: '请输入有效数字' };
  if (num <= 0) return { valid: false, msg: '金额必须大于 0' };
  if (num > 999999999.99) return { valid: false, msg: '金额不能超过 999,999,999.99' };
  // 检查小数位数
  const parts = String(value).split('.');
  if (parts.length === 2 && parts[1].length > 2) return { valid: false, msg: '最多两位小数' };
  return { valid: true, msg: '' };
}

/** 验证日期 */
export function validateDate(value) {
  if (!value) return { valid: false, msg: '请选择日期' };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { valid: false, msg: '日期格式不正确' };
  return { valid: true, msg: '' };
}

/** 验证备注 */
export function validateNote(value) {
  if (value && value.length > 200) return { valid: false, msg: '备注最多 200 字' };
  return { valid: true, msg: '' };
}

/** 验证预算金额 */
export function validateBudget(value) {
  const num = Number(value);
  if (value === '' || value === null) return { valid: false, msg: '请输入预算金额' };
  if (isNaN(num)) return { valid: false, msg: '请输入有效数字' };
  if (num < 0) return { valid: false, msg: '预算不能为负数' };
  return { valid: true, msg: '' };
}

/** 验证账户名称 */
export function validateAccountName(value) {
  if (!value || !value.trim()) return { valid: false, msg: '请输入账户名称' };
  if (value.trim().length > 20) return { valid: false, msg: '账户名称最多 20 字' };
  return { valid: true, msg: '' };
}
