import { migrate, seed } from './model.js';
export const DATA_KEY = 'bkm-projetos-demo-v1';
export function createRepository(storage) {
  let current, warning = '', blocked = false;
  try { const raw = storage.getItem(DATA_KEY); current = raw ? migrate(JSON.parse(raw)) : seed(); }
  catch { current = seed(); blocked = true; warning = 'Não foi possível ler os dados salvos. Os exemplos foram abertos sem substituir o conteúdo existente. Para continuar, revise o armazenamento do navegador ou restaure os exemplos em Configurações.'; }
  return {
    get data() { return structuredClone(current); },
    get warning() { return warning; },
    update(change) {
      if (blocked) throw new Error('O armazenamento local precisa ser recuperado ou restaurado antes de salvar.');
      const candidate = structuredClone(current);
      const result = change(candidate);
      try { storage.setItem(DATA_KEY, JSON.stringify(candidate)); }
      catch { throw new Error('Não foi possível salvar no navegador. Nenhuma alteração foi aplicada. Verifique o espaço disponível e as permissões de armazenamento.'); }
      current = candidate; return result;
    },
    reset() {
      const candidate = seed();
      try { storage.setItem(DATA_KEY, JSON.stringify(candidate)); }
      catch { throw new Error('Não foi possível restaurar os exemplos no navegador.'); }
      current = candidate; blocked = false; warning = '';
    }
  };
}
