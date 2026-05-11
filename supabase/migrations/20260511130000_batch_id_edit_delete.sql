-- Adiciona batch_id para identificar cada rodada de 10 números
ALTER TABLE public.draw_numbers ADD COLUMN IF NOT EXISTS batch_id uuid;

-- Migra dados existentes: agrupa por (draw_id, floor((position-1)/10)) e atribui o mesmo uuid
DO $$
DECLARE
  r RECORD;
  v_bid uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT draw_id, floor((position - 1) / 10)::int AS grp
    FROM public.draw_numbers
    WHERE batch_id IS NULL
  LOOP
    v_bid := gen_random_uuid();
    UPDATE public.draw_numbers
    SET batch_id = v_bid
    WHERE draw_id = r.draw_id
      AND floor((position - 1) / 10)::int = r.grp
      AND batch_id IS NULL;
  END LOOP;
END $$;

-- Atualiza add_draw_numbers_batch para persistir o batch_id em todos os 10 números
CREATE OR REPLACE FUNCTION public.add_draw_numbers_batch(
  p_draw     uuid,
  p_numbers  smallint[],
  p_drawn_at timestamptz DEFAULT now()
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_pos int;
  v_batch_id  uuid := gen_random_uuid();
  i           int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF array_length(p_numbers, 1) IS DISTINCT FROM 10 THEN
    RAISE EXCEPTION 'a rodada deve ter exatamente 10 números';
  END IF;

  IF (SELECT count(distinct n) FROM unnest(p_numbers) n) <> 10 THEN
    RAISE EXCEPTION 'os números não podem se repetir dentro da mesma rodada';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_numbers) n WHERE n < 0 OR n > 99) THEN
    RAISE EXCEPTION 'todos os números devem estar entre 0 e 99';
  END IF;

  IF (SELECT status FROM public.draws WHERE id = p_draw) <> 'active' THEN
    RAISE EXCEPTION 'sorteio não está ativo';
  END IF;

  SELECT coalesce(MAX(position), 0) INTO v_start_pos
  FROM public.draw_numbers WHERE draw_id = p_draw;

  IF v_start_pos + 10 > 100 THEN
    RAISE EXCEPTION 'limite de 100 números sorteados atingido';
  END IF;

  FOR i IN 1..10 LOOP
    INSERT INTO public.draw_numbers(draw_id, number, position, drawn_at, batch_id)
    VALUES (p_draw, p_numbers[i], v_start_pos + i, p_drawn_at, v_batch_id);
  END LOOP;
END $$;

-- Deleta uma rodada inteira pelo batch_id
CREATE OR REPLACE FUNCTION public.delete_draw_round(p_draw uuid, p_batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF (SELECT status FROM public.draws WHERE id = p_draw) <> 'active' THEN
    RAISE EXCEPTION 'sorteio não está ativo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.draw_numbers
    WHERE batch_id = p_batch_id AND draw_id = p_draw
  ) THEN
    RAISE EXCEPTION 'rodada não encontrada';
  END IF;

  DELETE FROM public.draw_numbers
  WHERE batch_id = p_batch_id AND draw_id = p_draw;
END $$;

-- Edita uma rodada: substitui os 10 números mantendo as mesmas posições e batch_id
CREATE OR REPLACE FUNCTION public.update_draw_round(
  p_draw      uuid,
  p_batch_id  uuid,
  p_numbers   smallint[],
  p_drawn_at  timestamptz
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min_pos int;
  i         int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF array_length(p_numbers, 1) IS DISTINCT FROM 10 THEN
    RAISE EXCEPTION 'a rodada deve ter exatamente 10 números';
  END IF;

  IF (SELECT count(distinct n) FROM unnest(p_numbers) n) <> 10 THEN
    RAISE EXCEPTION 'os números não podem se repetir dentro da mesma rodada';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_numbers) n WHERE n < 0 OR n > 99) THEN
    RAISE EXCEPTION 'todos os números devem estar entre 0 e 99';
  END IF;

  IF (SELECT status FROM public.draws WHERE id = p_draw) <> 'active' THEN
    RAISE EXCEPTION 'sorteio não está ativo';
  END IF;

  SELECT MIN(position) INTO v_min_pos
  FROM public.draw_numbers
  WHERE batch_id = p_batch_id AND draw_id = p_draw;

  IF v_min_pos IS NULL THEN
    RAISE EXCEPTION 'rodada não encontrada';
  END IF;

  DELETE FROM public.draw_numbers
  WHERE batch_id = p_batch_id AND draw_id = p_draw;

  FOR i IN 1..10 LOOP
    INSERT INTO public.draw_numbers(draw_id, number, position, drawn_at, batch_id)
    VALUES (p_draw, p_numbers[i], v_min_pos + i - 1, p_drawn_at, p_batch_id);
  END LOOP;
END $$;
