// Stub de `expo-crypto` para os testes em Node (o módulo nativo não existe fora
// do runtime React Native). Aliased em vitest.config.ts. O id gerado com ele é de
// LINHA (idempotência de fila), não um segredo — Math.random basta em teste.
export function getRandomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}
