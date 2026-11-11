import { Alert, Button } from "@mui/material";

interface QueryErrorProps {
  title: string;
  error: Error;
  onRetry: () => void;
}

export function QueryError({ title, error, onRetry }: QueryErrorProps) {
  return (
    <Alert
      severity="error"
      variant="outlined"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      <strong>{title}.</strong> {error.message}
    </Alert>
  );
}
