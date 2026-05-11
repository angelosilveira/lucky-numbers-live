-- Adiciona campo commission na tabela settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS commission numeric(5,2) NOT NULL DEFAULT 0
    CONSTRAINT settings_commission_range CHECK (commission >= 0 AND commission <= 100);

-- Aumenta o limite de posição de 10 para 100 em draw_numbers
ALTER TABLE public.draw_numbers
  DROP CONSTRAINT IF EXISTS draw_numbers_position_check;
ALTER TABLE public.draw_numbers
  ADD CONSTRAINT draw_numbers_position_check CHECK (position BETWEEN 1 AND 100);

-- Atualiza função add_draw_number para permitir até 100 números por sorteio
CREATE OR REPLACE FUNCTION public.add_draw_number(p_draw uuid, p_number smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pos int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF (SELECT status FROM public.draws WHERE id = p_draw) <> 'active' THEN
    RAISE EXCEPTION 'sorteio não está ativo';
  END IF;
  SELECT coalesce(MAX(position), 0) + 1 INTO v_pos
  FROM public.draw_numbers
  WHERE draw_id = p_draw;
  IF v_pos > 100 THEN
    RAISE EXCEPTION 'limite de 100 números atingido';
  END IF;
  INSERT INTO public.draw_numbers(draw_id, number, position)
  VALUES (p_draw, p_number, v_pos);
END $$;
