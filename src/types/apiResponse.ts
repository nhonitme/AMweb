export interface ApiResponse<T> {
  Status: number;
    Success: boolean;
    Message: string;
    Data: T;
    Metadata: string;
    Timestamp: string;
}