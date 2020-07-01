exports.check = (params, requirements) => {
  
  // console.log(params);
  
  const errors = [];
  
  for (let param in requirements) {
    let conditions = requirements[param];
    
    // console.log(param);
    // console.log(conditions);
    
    if (typeof params[param] === "undefined") {
      if (conditions.required) {
        errors.push(`Отсутсвует параметр «${param}», отмеченный как обязательный`);
      }
      continue;
    }
    
    if (conditions.type) {
      let paramType = typeof params[param];
      if (paramType !== conditions.type) {
        errors.push(`Параметр «${param}» должен быть типа «${conditions.type}», а не «${paramType}»`);
      }
    }
    
  }
  
  if (errors.length) {
    throw new Error('Проверка параметров завершилась с ошибками: ' + errors.join('; ').bgRed);    
  }
  
}