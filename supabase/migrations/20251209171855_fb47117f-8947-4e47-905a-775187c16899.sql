-- Create table for project training configuration
CREATE TABLE public.project_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  system_prompt TEXT,
  first_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Create table for Q&A training examples
CREATE TABLE public.training_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_examples ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_training
CREATE POLICY "Users can view their own project training"
ON public.project_training FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_training.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own project training"
ON public.project_training FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_training.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own project training"
ON public.project_training FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_training.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own project training"
ON public.project_training FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_training.project_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS policies for training_examples
CREATE POLICY "Users can view their own training examples"
ON public.training_examples FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = training_examples.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own training examples"
ON public.training_examples FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = training_examples.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own training examples"
ON public.training_examples FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = training_examples.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own training examples"
ON public.training_examples FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = training_examples.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_project_training_updated_at
BEFORE UPDATE ON public.project_training
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_examples_updated_at
BEFORE UPDATE ON public.training_examples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();