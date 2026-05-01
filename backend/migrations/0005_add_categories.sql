PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  icon TEXT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);

-- Categorias padrão de despesas
INSERT OR IGNORE INTO categories (id, user_id, name, color, icon, type) VALUES
  ('cat-alimentacao',  NULL, 'Alimentação',    '#22c55e', 'utensils',       'expense'),
  ('cat-transporte',   NULL, 'Transporte',     '#3b82f6', 'car',            'expense'),
  ('cat-moradia',      NULL, 'Moradia',        '#8b5cf6', 'home',           'expense'),
  ('cat-lazer',        NULL, 'Lazer',          '#f59e0b', 'gamepad-2',      'expense'),
  ('cat-saude',        NULL, 'Saúde',          '#ef4444', 'heart-pulse',    'expense'),
  ('cat-educacao',     NULL, 'Educação',       '#06b6d4', 'graduation-cap', 'expense'),
  ('cat-assinaturas',  NULL, 'Assinaturas',    '#ec4899', 'repeat',         'expense'),
  ('cat-compras',      NULL, 'Compras',        '#f97316', 'shopping-bag',   'expense'),
  ('cat-pets',         NULL, 'Pets',           '#a855f7', 'paw-print',      'expense'),
  ('cat-outros',       NULL, 'Outros',         '#6b7280', 'more-horizontal','both'),
  ('cat-salario',      NULL, 'Salário',        '#10b981', 'banknote',       'income'),
  ('cat-freelance',    NULL, 'Freelance',      '#14b8a6', 'laptop',         'income'),
  ('cat-investimento', NULL, 'Investimentos',  '#6366f1', 'trending-up',    'income');
