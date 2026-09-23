-- Update handle_new_user to save phone for photographers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );

  -- If photographer, also create photographer record with phone
  IF coalesce(new.raw_user_meta_data->>'role', 'client') = 'photographer' THEN
    INSERT INTO public.photographers (id, phone)
    VALUES (new.id, new.raw_user_meta_data->>'phone');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
