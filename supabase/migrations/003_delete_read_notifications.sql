-- Migration: Suppression automatique des notifications lues
-- Quand read_at est défini, la notification est supprimée automatiquement

CREATE OR REPLACE FUNCTION delete_read_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    DELETE FROM notifications WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_notification_read
  AFTER UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION delete_read_notification();
