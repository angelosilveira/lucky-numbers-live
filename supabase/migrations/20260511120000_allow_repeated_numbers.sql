-- Remove a constraint que impedia o mesmo número aparecer mais de uma vez no sorteio
-- (números podem repetir entre rodadas — sorteio com reposição)
ALTER TABLE public.draw_numbers DROP CONSTRAINT IF EXISTS draw_numbers_draw_id_number_key;

-- Atualiza a função batch removendo a verificação de repetição entre rodadas
CREATE OR REPLACE FUNCTION public.add_draw_numbers_batch(
  p_draw     uuid,
  p_numbers  smallint[],
  p_drawn_at timestamptz DEFAULT now()
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_pos int;
  i           int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF array_length(p_numbers, 1) IS DISTINCT FROM 10 THEN
    RAISE EXCEPTION 'a rodada deve ter exatamente 10 números';
  END IF;

  -- Apenas números únicos DENTRO da mesma rodada
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
    INSERT INTO public.draw_numbers(draw_id, number, position, drawn_at)
    VALUES (p_draw, p_numbers[i], v_start_pos + i, p_drawn_at);
  END LOOP;
END $$;
