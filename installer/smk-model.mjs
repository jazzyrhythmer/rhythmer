const profiles = {
  pro: {model: 'SMK-37 Pro', family: 8, products: ['9748025','9748026','9748027','9748028']},
  elite: {model: 'SMK-37 Elite', family: 9, products: ['9748027','9748028']},
};
export function profile(key = 'pro') {
  if (!Object.hasOwn(profiles,key)) throw Error('Unsupported SMK keyboard model.');
  return profiles[key];
}
export function permitsPackage(product, key) {
  const {model,products}=profile(key);
  return products.some(id=>product===model+'_'+id);
}
export function permitsDevice(id, key) {
  const {model}=profile(key);
  return id?.model===model||id?.model==='ota-'+model;
}
