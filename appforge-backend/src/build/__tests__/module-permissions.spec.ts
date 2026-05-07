import * as fs from 'fs';
import * as path from 'path';

describe('module-permissions JSON', () => {
  const backendPath = path.join(__dirname, '..', 'module-permissions.json');
  const builderPath = path.join(
    __dirname, '..', '..', '..', '..',
    'appforge-builder', 'src', 'lib', 'module-permissions.json',
  );
  const builderExists = fs.existsSync(builderPath);

  // Skip the parity assertion when the builder isn't on disk — happens in CI
  // setups that mount only appforge-backend/. The other validations run anyway.
  (builderExists ? it : it.skip)(
    'builder copy matches the backend source byte-for-byte',
    () => {
      const backend = JSON.parse(fs.readFileSync(backendPath, 'utf-8'));
      const builder = JSON.parse(fs.readFileSync(builderPath, 'utf-8'));
      expect(JSON.stringify(builder, null, 2)).toBe(JSON.stringify(backend, null, 2));
    },
  );

  if (!builderExists) {
    // eslint-disable-next-line no-console
    console.warn(
      '[parity test] builder path not found, skipping parity check — only verified in full-monorepo runs',
    );
  }

  it('every iOS permission key starts with NS', () => {
    const json = JSON.parse(fs.readFileSync(backendPath, 'utf-8'));
    for (const perms of Object.values(json.ios)) {
      for (const key of perms as string[]) {
        expect(key).toMatch(/^NS[A-Z]/);
      }
    }
    for (const key of Object.keys(json.iosDescriptions)) {
      expect(key).toMatch(/^NS[A-Z]/);
    }
  });

  it('Android permissions are uppercase identifiers', () => {
    const json = JSON.parse(fs.readFileSync(backendPath, 'utf-8'));
    for (const perms of Object.values(json.android)) {
      for (const perm of perms as string[]) {
        expect(perm).toMatch(/^[A-Z][A-Z_]+$/);
      }
    }
  });

  it('every iOS key referenced from a module has an entry in iosDescriptions', () => {
    const json = JSON.parse(fs.readFileSync(backendPath, 'utf-8'));
    const referenced = new Set<string>();
    for (const perms of Object.values(json.ios)) {
      for (const key of perms as string[]) referenced.add(key);
    }
    for (const key of referenced) {
      expect(json.iosDescriptions[key]).toBeDefined();
    }
  });
});
