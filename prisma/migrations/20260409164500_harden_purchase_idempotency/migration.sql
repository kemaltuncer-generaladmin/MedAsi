-- Aynı kullanıcı için aynı ödeme referansının (paymentIntentId/ref_id) ikinci kez işlenmesini engeller.
CREATE UNIQUE INDEX IF NOT EXISTS uq_token_transactions_purchase_user_ref
  ON token_transactions (user_id, ref_id)
  WHERE type = 'purchase' AND ref_id IS NOT NULL;
