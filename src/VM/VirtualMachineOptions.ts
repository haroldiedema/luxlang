export interface VirtualMachineOptions
{
    functions?: Record<string, (...args: any[]) => any>;
    variables?: Record<string, any>;
    throwOnError?: boolean;
}
