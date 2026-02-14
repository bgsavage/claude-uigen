The goal is to update any vulnerable dependencies.

Do the following
1.  Run `npm audit` to find vulnerable installed packages in this project.
2.  Run `npm audit fix` to apply updates automatically
3.  If vulnerabilities still remain, update minor versions of packages in which the vulnerability was addressed.  Update required peer dependencies too.
4.  Run tests to make sure nothing actually broke.